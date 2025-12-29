import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../Styles/appStyle";

/**
 * Universal Project List
 *
 * Renders ANY card UI based on injected CardComponent
 *
 * Props:
 * - projects
 * - CardComponent (UI for each project)
 * - onStartProject(project)
 * - onViewDetails(project)
 * - onLoadMore()
 * - canLoadMore
 * - loadingMore
 */

const UniversalProjectList = ({
  projects = [],
  CardComponent, // 🔥 this is the injected card UI
  onStartProject = null,
  onViewDetails,
  onLoadMore = null,
  canLoadMore = false,
  loadingMore = false,
}) => {
  if (!projects.length)
    return (
      <View style={styles.empty}>
        <Ionicons name="folder-open-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>No Projects Found</Text>
      </View>
    );

    // console.log(projects)

  return (
    <View>
      {projects.map((project, index) => (
        <CardComponent
          key={index}
          project={project}
          onStartProject={onStartProject}
          onViewDetails={onViewDetails}
        />
      ))}

      {/* LOAD MORE */}
      {onLoadMore && canLoadMore && (
        <View style={styles.loadMoreContainer}>
          {loadingMore ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={onLoadMore}>
              <Text style={styles.loadMoreText}>Load More Projects</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

export default UniversalProjectList;

const styles = StyleSheet.create({
  empty: { alignItems: "center", paddingVertical: 50 },
  emptyText: { marginTop: 12, color: "#666" },

  loadMoreContainer: { alignItems: "center", paddingVertical: 20 },
  loadMoreBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  loadMoreText: { color: "#fff", fontWeight: "600" },
});
